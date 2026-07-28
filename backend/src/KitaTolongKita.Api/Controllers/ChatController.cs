using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using KitaTolongKita.Core.DTOs;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers;

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPushNotificationService _push;
    private readonly ILogger<ChatController> _logger;

    public ChatController(AppDbContext db, IPushNotificationService push, ILogger<ChatController> logger)
    {
        _db = db;
        _push = push;
        _logger = logger;
    }

    /// <summary>Get all conversations for the current user.</summary>
    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations()
    {
        var userId = GetUserId();
        var conversations = await _db.Conversations
            .Include(c => c.Participants)
            .Include(c => c.LastMessage)
            .Where(c => c.Participants.Any(p => p.UserId == userId))
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .Select(c => new ConversationDto(
                c.Id,
                c.Participants
                    .Where(p => p.UserId != userId)
                    .Select(p => p.User!.FullName)
                    .FirstOrDefault() ?? "Unknown",
                c.LastMessage != null ? c.LastMessage.Content : "",
                c.LastMessageAt,
                c.Participants.Count(p => !p.LastReadAt.HasValue || p.LastReadAt < c.LastMessageAt),
                c.DealId
            ))
            .ToListAsync();

        return Ok(conversations);
    }

    /// <summary>Get messages in a conversation.</summary>
    [HttpGet("{conversationId:guid}/messages")]
    public async Task<IActionResult> GetMessages(Guid conversationId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var userId = GetUserId();

        // Verify user is a participant
        var isParticipant = await _db.ConversationParticipants
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId);

        if (!isParticipant)
            return Forbid();

        // Mark as read
        var participant = await _db.ConversationParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId);

        if (participant != null)
        {
            participant.LastReadAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        var messages = await _db.ChatMessages
            .Where(m => m.ConversationId == conversationId)
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new ChatMessageDto(m.Id, m.SenderId, m.Content, m.CreatedAt, m.SenderId == userId))
            .ToListAsync();

        return Ok(messages);
    }

    /// <summary>Send a message in a conversation (or create a new conversation).</summary>
    [HttpPost("messages")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
    {
        var userId = GetUserId();

        Conversation conversation;

        if (request.ConversationId.HasValue)
        {
            conversation = await _db.Conversations
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == request.ConversationId.Value);

            if (conversation == null)
                return NotFound(new { message = "Conversation not found." });

            if (!conversation.Participants.Any(p => p.UserId == userId))
                return Forbid();
        }
        else
        {
            // Create new conversation
            if (!request.RecipientId.HasValue && string.IsNullOrEmpty(request.RecipientEmail))
                return BadRequest(new { message = "Recipient required for new conversation." });

            Guid recipientId = request.RecipientId ?? (await _db.Users.FirstOrDefaultAsync(u => u.Email == request.RecipientEmail))?.Id
                ?? Guid.Empty;

            if (recipientId == Guid.Empty)
                return NotFound(new { message = "Recipient not found." });

            // Check for existing conversation
            var existing = await _db.Conversations
                .Include(c => c.Participants)
                .Where(c => c.Participants.Count == 2 &&
                    c.Participants.Any(p => p.UserId == userId) &&
                    c.Participants.Any(p => p.UserId == recipientId) &&
                    c.DealId == request.DealId)
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                conversation = existing;
            }
            else
            {
                conversation = new Conversation
                {
                    DealId = request.DealId,
                    CreatedAt = DateTime.UtcNow,
                    Participants = new List<ConversationParticipant>
                    {
                        new() { UserId = userId },
                        new() { UserId = recipientId },
                    }
                };
                _db.Conversations.Add(conversation);
                await _db.SaveChangesAsync();
            }
        }

        // Create message
        var message = new ChatMessage
        {
            ConversationId = conversation.Id,
            SenderId = userId,
            Content = request.Content,
            CreatedAt = DateTime.UtcNow
        };

        _db.ChatMessages.Add(message);

        conversation.LastMessageAt = message.CreatedAt;
        conversation.LastMessage = message;

        await _db.SaveChangesAsync();

        // Send push notification to the other participant(s)
        var recipientIds = conversation.Participants
            .Where(p => p.UserId != userId)
            .Select(p => p.UserId)
            .ToList();

        var senderName = (await _db.Users.FindAsync(userId))?.FullName ?? "Someone";

        _ = Task.Run(async () =>
        {
            try
            {
                foreach (var recipientId in recipientIds)
                {
                    await _push.SendToUserAsync(recipientId, senderName, request.Content ?? "", new
                    {
                        type = "chat_message",
                        conversationId = conversation.Id.ToString(),
                        dealId = conversation.DealId?.ToString() ?? ""
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send chat push notification");
            }
        });

        return Ok(new ChatMessageDto(message.Id, message.SenderId, message.Content, message.CreatedAt, true));
    }

    private Guid GetUserId()
    {
        var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(idStr, out var id) ? id : Guid.Empty;
    }
}

public record SendMessageRequest(
    Guid? ConversationId,
    Guid? RecipientId,
    string? RecipientEmail,
    Guid? DealId,
    string Content
);

public record ConversationDto(
    Guid Id,
    string OtherParticipantName,
    string LastMessage,
    DateTime? LastMessageAt,
    int UnreadCount,
    Guid? DealId
);

public record ChatMessageDto(
    Guid Id,
    Guid SenderId,
    string Content,
    DateTime CreatedAt,
    bool IsMine
);

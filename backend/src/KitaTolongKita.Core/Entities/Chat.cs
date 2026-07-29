namespace KitaTolongKita.Core.Entities;

public class Conversation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? DealId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastMessageAt { get; set; }

    // Two navigation properties to ChatMessage exist below: LastMessage (single, nullable)
    // and Messages (collection). EF can't auto-disambiguate a single FK for both, so
    // we expose an explicit FK column `LastMessageId` for the LastMessage relationship.
    public Guid? LastMessageId { get; set; }
    public ChatMessage? LastMessage { get; set; }

    public List<ConversationParticipant> Participants { get; set; } = [];
    public List<ChatMessage> Messages { get; set; } = [];
}

public class ConversationParticipant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ConversationId { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public DateTime? LastReadAt { get; set; }
}

public class ChatMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsRead { get; set; }
}

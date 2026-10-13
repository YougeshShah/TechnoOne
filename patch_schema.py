import pathlib

path = pathlib.Path("prisma/schema.prisma")
text = path.read_text()

# 1) Insert new relation lines into the User model, right after the
#    individualPermissions line.
anchor = "  individualPermissions UserPermission[]\n"
count = text.count(anchor)
if count != 1:
    print(f"ERROR (User relations): anchor count = {count}. Aborting -- schema.prisma may differ from what this patch expects.")
    raise SystemExit(1)

user_addition = (
    anchor
    + "  conversationsAsUserA Conversation[] @relation(\"ConversationAsUserA\")\n"
    + "  conversationsAsUserB Conversation[] @relation(\"ConversationAsUserB\")\n"
    + "  sentMessages         Message[]      @relation(\"MessageSender\")\n"
)
text = text.replace(anchor, user_addition)

# 2) Append the two new models at the end of the file.
new_models = """

// ------------------------------------------------------------
// MESSAGING (real user-to-user chat -- Lawyer<->Client,
// Institution/Teacher<->Student, Institution/LawFirm<->Company)
// ------------------------------------------------------------

model Conversation {
  id              String    @id @default(uuid())
  userAId         String
  userA           User      @relation("ConversationAsUserA", fields: [userAId], references: [id], onDelete: Cascade)
  userBId         String
  userB           User      @relation("ConversationAsUserB", fields: [userBId], references: [id], onDelete: Cascade)
  lastMessageAt   DateTime?
  lastMessageText String?
  createdAt       DateTime  @default(now())

  messages        Message[]

  @@unique([userAId, userBId])
  @@index([userAId])
  @@index([userBId])
}

model Message {
  id             String       @id @default(uuid())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  conversationId String
  sender         User         @relation("MessageSender", fields: [senderId], references: [id], onDelete: Cascade)
  senderId       String
  content        String
  isRead         Boolean      @default(false)
  readAt         DateTime?
  createdAt      DateTime     @default(now())

  @@index([conversationId, createdAt])
  @@index([senderId])
}
"""

if "model Conversation {" in text:
    print("ERROR: 'model Conversation' already exists in schema.prisma. Aborting to avoid duplicating it.")
    raise SystemExit(1)

text = text.rstrip("\n") + "\n" + new_models

path.write_text(text)
print("Patched prisma/schema.prisma successfully:")
print("  - Added conversationsAsUserA / conversationsAsUserB / sentMessages relations to User model")
print("  - Added Conversation and Message models at the end of the file")

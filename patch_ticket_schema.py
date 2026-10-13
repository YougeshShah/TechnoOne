import pathlib

path = pathlib.Path("prisma/schema.prisma")
text = path.read_text()

if "model SupportTicket {" in text:
    print("ERROR: 'model SupportTicket' already exists in schema.prisma. Aborting to avoid duplicating it.")
    raise SystemExit(1)

# 1) User model -- add reverse relations for tickets created / commented.
user_anchor = '  sentMessages         Message[]      @relation("MessageSender")\n'
if text.count(user_anchor) != 1:
    print(f"ERROR (User relations): anchor count = {text.count(user_anchor)}. Aborting -- schema.prisma may differ from what this patch expects.")
    raise SystemExit(1)
text = text.replace(
    user_anchor,
    user_anchor
    + '  ticketsCreated       SupportTicket[] @relation("TicketCreatedBy")\n'
    + '  ticketComments       TicketComment[] @relation("TicketCommentAuthor")\n',
    1,
)

# 2) LawFirm model -- add reverse relation for its support tickets.
lawfirm_anchor = "  tenantType      TenantType    @default(LAW_FIRM)\n"
if text.count(lawfirm_anchor) != 1:
    print(f"ERROR (LawFirm relation): anchor count = {text.count(lawfirm_anchor)}. Aborting -- schema.prisma may differ from what this patch expects.")
    raise SystemExit(1)
text = text.replace(
    lawfirm_anchor,
    lawfirm_anchor + "  supportTickets  SupportTicket[]\n",
    1,
)

# 3) Append the new enum + models at the end of the file.
new_block = '''

// ------------------------------------------------------------
// SUPPORT TICKETS (async Institution/LawFirm <-> Company support,
// replacing real-time chat for this one relationship)
// ------------------------------------------------------------

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

model SupportTicket {
  id          String        @id @default(uuid())
  lawFirmId   String
  lawFirm     LawFirm       @relation(fields: [lawFirmId], references: [id], onDelete: Cascade)
  createdById String
  createdBy   User          @relation("TicketCreatedBy", fields: [createdById], references: [id], onDelete: Cascade)
  subject     String
  description String
  status      TicketStatus  @default(OPEN)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  comments    TicketComment[]

  @@index([lawFirmId])
  @@index([status])
}

model TicketComment {
  id        String        @id @default(uuid())
  ticket    SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  ticketId  String
  authorId  String
  author    User          @relation("TicketCommentAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  content   String
  createdAt DateTime      @default(now())

  @@index([ticketId, createdAt])
}
'''

text = text.rstrip("\n") + "\n" + new_block

path.write_text(text)
print("Patched prisma/schema.prisma successfully:")
print("  - Added ticketsCreated / ticketComments relations to User model")
print("  - Added supportTickets relation to LawFirm model")
print("  - Added TicketStatus enum, SupportTicket and TicketComment models")

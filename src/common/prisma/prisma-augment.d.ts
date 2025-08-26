import '@prisma/client';

declare module '@prisma/client' {
  interface PrismaClient {
    mailLog: unknown; // temporary augmentation until regenerate picks up model properly
  }
}

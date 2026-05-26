const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.knowledgeDocument.findMany();
  console.log("Documents in DB:");
  console.log(JSON.stringify(docs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

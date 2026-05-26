const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check if any hotel exists
  const count = await prisma.hotel.count();
  if (count === 0) {
    await prisma.hotel.create({
      data: {
        hotelName: 'Default Hotel',
        hotelPhone: '1234567890',
        hotelEmail: 'info@defaulthotel.com',
        // other required fields can be left to defaults
      },
    });
    console.log('✅ Seeded default hotel');
  } else {
    console.log(`🛎️ ${count} hotel(s) already exist`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

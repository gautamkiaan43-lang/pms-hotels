const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hotels = await prisma.hotel.findMany();
  console.log('--- HOTELS ---');
  hotels.forEach(h => {
    console.log(`Hotel ID: ${h.id}, Name: ${h.hotelName}, Code: ${h.hotelCode}`);
  });

  const guests = await prisma.guest.findMany();
  console.log('\n--- GUESTS ---');
  guests.forEach(g => {
    console.log(`Guest ID: ${g.id}, Name: ${g.name}, Phone: ${g.phone}, PMS ID: ${g.pmsGuestId}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

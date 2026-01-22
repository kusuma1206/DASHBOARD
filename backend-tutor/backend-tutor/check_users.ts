import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking User: akashkummara000@gmail.com ---');
    const user = await prisma.user.findUnique({
        where: { email: 'akashkummara000@gmail.com' },
        include: {
            cohortMemberships: {
                include: {
                    cohort: true
                }
            }
        }
    });

    if (user) {
        console.log(`User ID: ${user.userId}`);
        console.log(`FullName: ${user.fullName}`);
        console.log(`Cohorts: ${user.cohortMemberships.map(m => m.cohort.name).join(', ') || 'None'}`);
    } else {
        console.log('User not found by email.');
    }

    console.log('\n--- Checking Activity Log Users from Image ---');
    const ids = ['08c20f', '235a42', '368273', '522721'];
    for (const partialId of ids) {
        const activityUsers = await prisma.user.findMany({
            where: {
                userId: {
                    startsWith: partialId
                }
            },
            include: {
                cohortMemberships: {
                    include: {
                        cohort: true
                    }
                }
            }
        });

        activityUsers.forEach(u => {
            console.log(`ID: ${u.userId} | Name: ${u.fullName} | Cohorts: ${u.cohortMemberships.map(m => m.cohort.name).join(', ') || 'None'}`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

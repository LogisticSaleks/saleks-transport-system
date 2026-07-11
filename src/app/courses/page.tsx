import CourseTable from "@/components/courses/CourseTable";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const [trucks, customers] = await Promise.all([
    prisma.truck.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        licensePlate: true,
      },
      orderBy: [
        {
          name: "asc",
        },
        {
          licensePlate: "asc",
        },
      ],
    }),

    prisma.customer.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return (
    <CourseTable
      trucks={trucks}
      customers={customers}
    />
  );
}
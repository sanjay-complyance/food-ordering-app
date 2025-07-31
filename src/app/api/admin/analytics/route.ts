import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import User from "@/models/User";
import Menu from "@/models/Menu";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["admin", "superuser"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7d";

    // Calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let startDate: Date;
    switch (range) {
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // 7d
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get order statistics
    const [
      totalOrders,
      todayOrders,
      thisWeekOrders,
      thisMonthOrders,
      orderStatuses,
      dailyOrders,
      weeklyRevenue
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $week: "$createdAt"
            },
            revenue: { $sum: { $sum: "$items.price" } }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ])
    ]);

    // Get user statistics
    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ updatedAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } })
    ]);

    // Get menu statistics
    const [
      totalMenuItems,
      activeMenuItems,
      popularItems
    ] = await Promise.all([
      Menu.aggregate([
        {
          $unwind: "$items"
        },
        {
          $count: "total"
        }
      ]),
      Menu.aggregate([
        {
          $unwind: "$items"
        },
        {
          $match: {
            "items.available": true
          }
        },
        {
          $count: "active"
        }
      ]),
      Order.aggregate([
        {
          $unwind: "$items"
        },
        {
          $group: {
            _id: "$items.name",
            orderCount: { $sum: 1 }
          }
        },
        {
          $sort: { orderCount: -1 }
        },
        {
          $limit: 10
        }
      ])
    ]);

    // Calculate revenue statistics
    const revenueData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $sum: "$items.price" } },
          thisWeek: {
            $sum: {
              $cond: [
                { $gte: ["$createdAt", startOfWeek] },
                { $sum: "$items.price" },
                0
              ]
            }
          },
          thisMonth: {
            $sum: {
              $cond: [
                { $gte: ["$createdAt", startOfMonth] },
                { $sum: "$items.price" },
                0
              ]
            }
          }
        }
      }
    ]);

    const revenue = revenueData[0] || { total: 0, thisWeek: 0, thisMonth: 0 };
    const averageOrderValue = totalOrders > 0 ? revenue.total / totalOrders : 0;

    // Process order statuses
    const statusMap = { pending: 0, confirmed: 0, cancelled: 0 };
    orderStatuses.forEach((status: { _id: string; count: number }) => {
      statusMap[status._id as keyof typeof statusMap] = status.count;
    });

    // Process daily orders
    const dailyOrdersMap = new Map();
    dailyOrders.forEach((day: { _id: string; count: number }) => {
      dailyOrdersMap.set(day._id, day.count);
    });

    // Fill in missing dates
    const dailyOrdersArray = [];
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyOrdersArray.push({
        date: dateStr,
        count: dailyOrdersMap.get(dateStr) || 0
      });
    }

    // Process weekly revenue
    const weeklyRevenueArray = weeklyRevenue.map((week: { _id: number; revenue: number }) => ({
      week: week._id.toString(),
      revenue: week.revenue || 0
    }));

    const analyticsData = {
      orders: {
        total: totalOrders,
        pending: statusMap.pending,
        confirmed: statusMap.confirmed,
        cancelled: statusMap.cancelled,
        today: todayOrders,
        thisWeek: thisWeekOrders,
        thisMonth: thisMonthOrders,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: newUsersThisMonth,
      },
      revenue: {
        total: revenue.total,
        thisWeek: revenue.thisWeek,
        thisMonth: revenue.thisMonth,
        averageOrderValue,
      },
      menu: {
        totalItems: totalMenuItems[0]?.total || 0,
        activeItems: activeMenuItems[0]?.active || 0,
        popularItems: popularItems.map((item: { _id: string; orderCount: number }) => ({
          name: item._id,
          orderCount: item.orderCount
        })),
      },
      trends: {
        dailyOrders: dailyOrdersArray,
        weeklyRevenue: weeklyRevenueArray,
      },
    };

    return NextResponse.json({ data: analyticsData });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
} 
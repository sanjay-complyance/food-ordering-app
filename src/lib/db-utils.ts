import { ObjectId } from "mongoose";
import User from "@/models/User";
import Menu from "@/models/Menu";
import Order from "@/models/Order";
import Notification from "@/models/Notification";
import {
  IUser,
  IMenu,
  IOrder,
  INotification,
  UserRole,
  OrderStatus,
  NotificationType,
} from "@/types/models";
import dbConnect from "./mongodb";

// User utilities
export class UserUtils {
  static async findByEmail(email: string): Promise<IUser | null> {
    await dbConnect();
    return User.findOne({ email: email.toLowerCase() }).exec();
  }

  static async findById(id: string | ObjectId): Promise<IUser | null> {
    await dbConnect();
    return User.findById(id).exec();
  }

  static async createUser(userData: Partial<IUser>): Promise<IUser> {
    await dbConnect();
    const user = new User(userData);
    return user.save();
  }

  static async updateUserRole(
    id: string | ObjectId,
    role: UserRole
  ): Promise<IUser | null> {
    await dbConnect();
    return User.findByIdAndUpdate(id, { role }, { new: true }).exec();
  }

  static async getAllUsers(): Promise<IUser[]> {
    await dbConnect();
    return User.find({}).sort({ createdAt: -1 }).exec();
  }
}

// Menu utilities
export class MenuUtils {
  static async findByDate(date: Date): Promise<IMenu | null> {
    await dbConnect();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Menu.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("createdBy", "name email")
      .exec();
  }

  static async createMenu(menuData: Partial<IMenu>): Promise<IMenu> {
    await dbConnect();
    const menu = new Menu(menuData);
    return menu.save();
  }

  static async updateMenu(
    id: string | ObjectId,
    menuData: Partial<IMenu>
  ): Promise<IMenu | null> {
    await dbConnect();
    return Menu.findByIdAndUpdate(id, menuData, { new: true })
      .populate("createdBy", "name email")
      .exec();
  }

  static async deleteMenu(id: string | ObjectId): Promise<IMenu | null> {
    await dbConnect();
    return Menu.findByIdAndDelete(id).exec();
  }

  static async getRecentMenus(limit: number = 10): Promise<IMenu[]> {
    await dbConnect();
    return Menu.find({})
      .sort({ date: -1 })
      .limit(limit)
      .populate("createdBy", "name email")
      .exec();
  }
}

// Order utilities
export class OrderUtils {
  static async findByUserAndDate(
    userId: string | ObjectId,
    date: Date
  ): Promise<IOrder | null> {
    await dbConnect();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Order.findOne({
      userId,
      orderDate: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("userId", "name email")
      .exec();
  }

  static async findByDate(date: Date): Promise<IOrder[]> {
    await dbConnect();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Order.find({
      orderDate: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .exec();
  }

  static async createOrder(orderData: Partial<IOrder>): Promise<IOrder> {
    await dbConnect();
    const order = new Order(orderData);
    return order.save();
  }

  static async updateOrder(
    id: string | ObjectId,
    orderData: Partial<IOrder>
  ): Promise<IOrder | null> {
    await dbConnect();
    return Order.findByIdAndUpdate(id, orderData, { new: true })
      .populate("userId", "name email")
      .exec();
  }

  static async deleteOrder(id: string | ObjectId): Promise<IOrder | null> {
    await dbConnect();
    return Order.findByIdAndDelete(id).exec();
  }

  static async updateOrderStatus(
    id: string | ObjectId,
    status: OrderStatus
  ): Promise<IOrder | null> {
    await dbConnect();
    return Order.findByIdAndUpdate(id, { status }, { new: true })
      .populate("userId", "name email")
      .exec();
  }

  static async getOrdersByUser(
    userId: string | ObjectId,
    limit: number = 10
  ): Promise<IOrder[]> {
    await dbConnect();
    return Order.find({ userId }).sort({ createdAt: -1 }).limit(limit).exec();
  }
}

// Notification utilities
export class NotificationUtils {
  static async findByUser(
    userId: string | ObjectId,
    unreadOnly: boolean = false
  ): Promise<INotification[]> {
    await dbConnect();
    const query: any = { userId };
    if (unreadOnly) {
      query.read = false;
    }
    return Notification.find(query).sort({ createdAt: -1 }).exec();
  }

  static async createNotification(
    notificationData: Partial<INotification>
  ): Promise<INotification> {
    await dbConnect();
    const notification = new Notification(notificationData);
    return notification.save();
  }

  static async markAsRead(
    id: string | ObjectId
  ): Promise<INotification | null> {
    await dbConnect();
    return Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    ).exec();
  }

  static async markAllAsRead(userId: string | ObjectId): Promise<void> {
    await dbConnect();
    await Notification.updateMany(
      { userId, read: false },
      { read: true }
    ).exec();
  }

  static async createSystemNotification(
    type: NotificationType,
    message: string
  ): Promise<INotification> {
    await dbConnect();
    const notification = new Notification({
      type,
      message,
      userId: undefined, // System-wide notification
    });
    return notification.save();
  }

  static async getUnreadCount(userId: string | ObjectId): Promise<number> {
    await dbConnect();
    return Notification.countDocuments({ userId, read: false }).exec();
  }

  static async deleteOldNotifications(daysOld: number = 30): Promise<void> {
    await dbConnect();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    await Notification.deleteMany({ createdAt: { $lt: cutoffDate } }).exec();
  }
}

// General database utilities
export class DatabaseUtils {
  static async healthCheck(): Promise<boolean> {
    try {
      await dbConnect();
      return true;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }

  static async clearTestData(): Promise<void> {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("clearTestData can only be called in test environment");
    }

    await dbConnect();
    await Promise.all([
      User.deleteMany({}),
      Menu.deleteMany({}),
      Order.deleteMany({}),
      Notification.deleteMany({}),
    ]);
  }
}

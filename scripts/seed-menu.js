const mongoose = require('mongoose');

// Define the Menu schema (updated version)
const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number },
  available: { type: Boolean, default: true }
}, { _id: false });

const menuSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  items: [menuItemSchema],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Menu = mongoose.model('Menu', menuSchema);

async function seedMenu() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/daily-lunch-ordering';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Sample menu data
    const sampleMenu = {
      name: "Daily Lunch Menu",
      description: "Our current selection of delicious lunch options",
      items: [
        {
          name: "Grilled Chicken Salad",
          description: "Fresh mixed greens with grilled chicken breast, cherry tomatoes, and balsamic vinaigrette",
          price: 12.99,
          available: true
        },
        {
          name: "Beef Burger",
          description: "Juicy beef patty with lettuce, tomato, cheese, and special sauce on a brioche bun",
          price: 14.99,
          available: true
        },
        {
          name: "Vegetarian Pasta",
          description: "Penne pasta with seasonal vegetables in a creamy tomato sauce",
          price: 11.99,
          available: true
        },
        {
          name: "Fish Tacos",
          description: "Three soft tacos with grilled fish, cabbage slaw, and chipotle mayo",
          price: 13.99,
          available: true
        },
        {
          name: "Caesar Salad",
          description: "Romaine lettuce, parmesan cheese, croutons, and caesar dressing",
          price: 10.99,
          available: true
        },
        {
          name: "Chicken Wrap",
          description: "Grilled chicken, avocado, lettuce, and ranch dressing in a whole wheat wrap",
          price: 12.99,
          available: true
        }
      ],
      isActive: true,
      createdBy: new mongoose.Types.ObjectId() // Create a dummy user ID
    };

    // Deactivate any existing active menus
    await Menu.updateMany({}, { isActive: false });
    console.log('Deactivated existing menus');

    // Check if menu already exists
    const existingMenu = await Menu.findOne({ name: sampleMenu.name });
    
    if (existingMenu) {
      console.log('Menu already exists, updating...');
      await Menu.findOneAndUpdate(
        { name: sampleMenu.name }, 
        { ...sampleMenu, isActive: true }, 
        { new: true }
      );
    } else {
      console.log('Creating new menu...');
      await Menu.create(sampleMenu);
    }

    console.log('Menu seeded successfully!');
    console.log('Current menu items:');
    sampleMenu.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} - $${item.price}`);
    });

  } catch (error) {
    console.error('Error seeding menu:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedMenu(); 
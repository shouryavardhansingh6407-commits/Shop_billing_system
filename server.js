const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect('mongodb://127.0.0.1:27017/shop_billing_db')
    .then(() => {
        console.log("Connected to MongoDB");
        seedDatabase();
    })
    .catch(err => console.error(err));

const userSchema = new mongoose.Schema({
    username: String,
    passwordHash: String
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
    name: String,
    category: String,
    price: Number,
    qty: Number
});
const Product = mongoose.model('Product', productSchema);

const billSchema = new mongoose.Schema({
    billNo: String,
    customerName: String,
    mobile: String,
    date: String,
    amount: Number,
    items: Array
});
const Bill = mongoose.model('Bill', billSchema);

async function seedDatabase() {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
        await User.create({ username: 'admin', passwordHash: 'password123' });
    }
    
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
        await Product.create([
            { name: 'Rice', category: 'Grocery', price: 60, qty: 20 },
            { name: 'Sugar', category: 'Grocery', price: 45, qty: 15 },
            { name: 'Cooking Oil', category: 'Grocery', price: 150, qty: 10 }
        ]);
    }
}

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, passwordHash: password });
    if (user) {
        res.json({ success: true, message: "Login successful" });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

app.get('/api/dashboard-stats', async (req, res) => {
    const productsCount = await Product.countDocuments();
    const billsCount = await Bill.countDocuments();
    
    const bills = await Bill.find();
    let totalSales = 0;
    bills.forEach(b => totalSales += b.amount);
    
    const recentBills = await Bill.find().sort({_id: -1}).limit(5);
    
    res.json({ productsCount, totalSales, billsCount, recentBills });
});

app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

app.post('/api/products', async (req, res) => {
    const { name, category, price, qty } = req.body;
    const newProduct = new Product({ name, category, price, qty });
    await newProduct.save();
    res.json({ success: true, product: newProduct });
});

app.post('/api/bills', async (req, res) => {
    const { billNo, customerName, mobile, date, amount, items } = req.body;
    
    const newBill = new Bill({ billNo, customerName, mobile, date, amount, items });
    await newBill.save();

    for (let item of items) {
        await Product.updateOne(
            { name: item.name },
            { $inc: { qty: -item.qty } }
        );
    }

    res.json({ success: true, bill: newBill });
});

app.get('/api/bills', async (req, res) => {
    const bills = await Bill.find().sort({_id: -1});
    res.json(bills);
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
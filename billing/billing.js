// Firebase Initialization (Direct Integration)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCymHpF7TcGBrjgOOqj6qIX1Djl4TSm-38",
    authDomain: "inventorymanager-ac0b9.firebaseapp.com",
    projectId: "inventorymanager-ac0b9",
    storageBucket: "inventorymanager-ac0b9.firebasestorage.app",
    messagingSenderId: "950166134114",
    appId: "1:950166134114:web:b853b87b957da39506e03b"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const itemSelect = document.getElementById("item-select");
const cartTable = document.getElementById("cart-table");
const itemQty = document.getElementById("item-qty");
const addToCartBtn = document.getElementById("add-to-cart");
const confirmPurchaseBtn = document.getElementById("confirm-purchase");
const customerName = document.getElementById("customer-name");
const customerPhone = document.getElementById("customer-phone");

let cart = [];
let inventoryItems = {};

// Fetch items from Firebase and populate the dropdown
async function loadInventory() {
    const querySnapshot = await getDocs(collection(db, "inventory"));
    querySnapshot.forEach((doc) => {
        const item = doc.data();
        inventoryItems[doc.id] = item;
        let option = document.createElement("option");
        option.value = doc.id;
        option.textContent = `${item.name} - ${item.category} (₹${item.price})`;
        itemSelect.appendChild(option);
    });
}

// Add item to cart
addToCartBtn.addEventListener("click", () => {
    const itemId = itemSelect.value;
    const qty = parseInt(itemQty.value);
    const item = inventoryItems[itemId];

    if (!item || qty <= 0 || qty > item.quantity) {
        alert("Invalid quantity or item out of stock!");
        return;
    }

    let existingItem = cart.find(i => i.id === itemId);
    if (existingItem) {
        existingItem.qty += qty;
    } else {
        cart.push({ id: itemId, name: item.name, qty, price: item.price });
    }

    updateCartUI();
});

// Update cart display
function updateCartUI() {
    cartTable.innerHTML = `<tr>
        <th>Item</th>
        <th>Quantity</th>
        <th>Price</th>
        <th>Total</th>
        <th>Remove</th>
    </tr>`;

    cart.forEach((item, index) => {
        let row = cartTable.insertRow();
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td>₹${item.price}</td>
            <td>₹${item.qty * item.price}</td>
            <td><button onclick="removeFromCart(${index})">❌</button></td>
        `;
    });
}

// Remove item from cart
window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartUI();
};

// Confirm purchase
confirmPurchaseBtn.addEventListener("click", async () => {
    if (!customerName.value || !customerPhone.value || cart.length === 0) {
        alert("Enter customer details and add items to cart!");
        return;
    }

    // Update stock in Firebase
    for (let item of cart) {
        let itemRef = doc(db, "inventory", item.id);
        let newQuantity = inventoryItems[item.id].quantity - item.qty;
        await updateDoc(itemRef, { quantity: newQuantity });
    }

    // Save transaction in Firebase
    const invoiceData = {
        name: customerName.value,
        phone: customerPhone.value,
        items: cart,
        total: cart.reduce((sum, item) => sum + item.qty * item.price, 0),
        date: new Date().toISOString()
    };
    await addDoc(collection(db, "bills"), invoiceData);

    // Generate PDF
    generateInvoice(invoiceData);

    // Reset UI
    cart = [];
    updateCartUI();
    alert("Purchase completed and invoice generated!");
});

// Generate PDF Invoice
function generateInvoice(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Restaurant Bill", 70, 20);
    doc.setFontSize(12);
    doc.text(`Customer Name: ${data.name}`, 20, 30);
    doc.text(`Phone Number: ${data.phone}`, 20, 40);
    doc.text(`Date: ${new Date(data.date).toLocaleString()}`, 150, 40);

    let y = 60;
    doc.text("S.No   Item   Qty   Price   Total", 20, y);
    y += 10;

    data.items.forEach((item, index) => {
        doc.text(`${index + 1}   ${item.name}   ${item.qty}   ₹${item.price}   ₹${item.qty * item.price}`, 20, y);
        y += 10;
    });

    doc.text(`Total Amount: ₹${data.total}`, 20, y + 10);
    doc.save(`Bill_${data.name}_${data.phone}.pdf`);
}

// Load Inventory on Page Load
loadInventory();

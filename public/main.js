document.addEventListener('DOMContentLoaded', () => {

    // 1. LOGIN LOGIC
    const loginForm = document.getElementById('loginForm') || document.querySelector('.login-conntainer form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const usernameInput = loginForm.querySelector('input[name="username"]').value;
            const passwordInput = loginForm.querySelector('input[name="password"]').value;

            fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usernameInput,
                    password: passwordInput
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    window.location.href = 'dashboard.html';
                } else {
                    alert(data.message || 'Login failed! Try admin / password123');
                }
            })
            .catch(err => {
                console.log(err);
                alert('Server error occurred');
            });
        });
    }

    // 2. DASHBOARD LOGIC
    const dashboardCards = document.querySelectorAll('.card');
    if (dashboardCards.length > 0) {
        fetch('/api/dashboard-stats')
            .then(res => res.json())
            .then(data => {
                if (dashboardCards[0]) dashboardCards[0].querySelector('h2').textContent = data.productsCount || 0;
                if (dashboardCards[1]) dashboardCards[1].querySelector('h2').textContent = '₹' + (data.totalSales || 0);
                if (dashboardCards[2]) dashboardCards[2].querySelector('h2').textContent = data.billsCount || 0;
                if (dashboardCards[3]) dashboardCards[3].querySelector('h2').textContent = '₹2500'; // Static daily goal

                const table = document.querySelector('table');
                if (table && data.recentBills) {
                    table.innerHTML = `
                        <tr>
                            <th>Bill No.</th>
                            <th>Customer Name</th>
                            <th>Date</th>
                            <th>Amount</th>
                        </tr>
                    `;
                    data.recentBills.forEach(bill => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${bill.billNo}</td>
                            <td>${bill.customerName}</td>
                            <td>${bill.date || new Date().toLocaleDateString()}</td>
                            <td>₹${bill.amount}</td>
                        `;
                        table.appendChild(tr);
                    });
                }
            })
            .catch(err => console.log(err));
    }

    // 3. PRODUCT MANAGEMENT LOGIC
    const productForm = document.querySelector('.product-form');
    const productTable = document.querySelector('.product-list table');
    
    if (productTable) {
        loadProducts();

        if (productForm) {
            const addBtn = productForm.querySelector('button');
            const inputs = productForm.querySelectorAll('input');
            const select = productForm.querySelector('select');

            addBtn.addEventListener('click', () => {
                const productName = inputs[0].value.trim();
                const category = select.value;
                const price = inputs[1].value;
                const quantity = inputs[2].value;

                if (!productName || !price || !quantity) {
                    alert('Please fill all product fields');
                    return;
                }

                fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: productName,
                        category: category,
                        price: Number(price),
                        qty: Number(quantity)
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert('Product added successfully');
                        inputs[0].value = '';
                        inputs[1].value = '';
                        inputs[2].value = '';
                        select.selectedIndex = 0;
                        loadProducts();
                    } else {
                        alert('Failed to add product');
                    }
                })
                .catch(err => console.log(err));
            });
        }

        function loadProducts() {
            fetch('/api/products')
                .then(res => res.json())
                .then(products => {
                    productTable.innerHTML = `
                        <tr>
                            <th>Product ID</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Quantity</th>
                        </tr>
                    `;
                    products.forEach(p => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${p._id.slice(-5).toUpperCase()}</td>
                            <td>${p.name}</td>
                            <td>${p.category}</td>
                            <td>₹${p.price}</td>
                            <td>${p.qty}</td>
                        `;
                        productTable.appendChild(row);
                    });
                })
                .catch(err => console.log(err));
        }
    }

    // 4. BILLING LOGIC
    const billingContainer = document.querySelector('.billing');
    if (billingContainer) {
        let cart = [];
        let availableProducts = [];

        const customerInputs = document.querySelectorAll('.customer input');
        const billTable = billingContainer.querySelector('table');
        const grandTotalDisplay = billingContainer.querySelector('.total h3');
        const generateBtn = document.querySelector('.buttons button:first-child');

        if (customerInputs[2] && !customerInputs[2].value) {
            customerInputs[2].value = 'BILL-' + Math.floor(100 + Math.random() * 900);
        }

        const selectorContainer = document.createElement('div');
        selectorContainer.style.marginBottom = '20px';
        selectorContainer.innerHTML = `
            <select id="cartProductSelect" style="padding: 10px; width: 45%; margin-right: 2%;">
                <option value="">Select Product</option>
            </select>
            <input type="number" id="cartProductQty" value="1" min="1" placeholder="Qty" style="padding: 10px; width: 20%; margin-right: 2%;">
            <button type="button" id="addToCartBtn" style="padding: 10px 15px; width: 28%; cursor: pointer;">Add Item</button>
        `;
        billingContainer.insertBefore(selectorContainer, billTable);

        const selectElement = document.getElementById('cartProductSelect');
        const qtyElement = document.getElementById('cartProductQty');
        const addBtn = document.getElementById('addToCartBtn');

        fetch('/api/products')
            .then(res => res.json())
            .then(data => {
                availableProducts = data;
                data.forEach(prod => {
                    const option = document.createElement('option');
                    option.value = prod._id;
                    option.textContent = prod.name + ' (₹' + prod.price + ') - Stock: ' + prod.qty;
                    selectElement.appendChild(option);
                });
            })
            .catch(err => console.log(err));

        renderCart();

        addBtn.addEventListener('click', () => {
            const selectedId = selectElement.value;
            const quantity = parseInt(qtyElement.value);

            if (!selectedId || !quantity || quantity <= 0) {
                alert('Please select a valid product and quantity');
                return;
            }

            const product = availableProducts.find(p => p._id === selectedId);
            if (!product) return;

            if (quantity > product.qty) {
                alert('Not enough stock! Current stock: ' + product.qty);
                return;
            }

            const existingIndex = cart.findIndex(item => item._id === selectedId);
            if (existingIndex > -1) {
                const newQty = cart[existingIndex].qty + quantity;
                if (newQty > product.qty) {
                    alert('Cannot exceed stock quantity');
                    return;
                }
                cart[existingIndex].qty = newQty;
                cart[existingIndex].lineTotal = newQty * product.price;
            } else {
                cart.push({
                    _id: product._id,
                    name: product.name,
                    qty: quantity,
                    price: parseFloat(product.price),
                    lineTotal: quantity * parseFloat(product.price)
                });
            }

            renderCart();
            qtyElement.value = 1;
        });

        function renderCart() {
            billTable.innerHTML = `
                <tr>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            `;

            let grandTotal = 0;
            cart.forEach(item => {
                grandTotal += item.lineTotal;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.name}</td>
                    <td>${item.qty}</td>
                    <td>₹${item.price}</td>
                    <td>₹${item.lineTotal}</td>
                `;
                billTable.appendChild(tr);
            });

            if (grandTotalDisplay) {
                grandTotalDisplay.textContent = 'Grand Total: ₹' + grandTotal;
            }
        }

        if (generateBtn) {
            generateBtn.removeAttribute('onclick');
            generateBtn.addEventListener('click', () => {
                if (cart.length === 0) {
                    alert('Please add at least one product to the bill');
                    return;
                }

                const customerName = customerInputs[0] ? customerInputs[0].value.trim() : 'Guest';
                const mobile = customerInputs[1] ? customerInputs[1].value.trim() : '';
                const billNumber = customerInputs[2] ? customerInputs[2].value.trim() : '';

                let grandTotal = 0;
                cart.forEach(i => grandTotal += i.lineTotal);

                fetch('/api/bills', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customerName: customerName,
                        mobile: mobile,
                        billNo: billNumber,
                        date: new Date().toLocaleDateString(),
                        items: cart,
                        amount: grandTotal
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert('Bill generated and saved successfully!');
                        window.print();
                        cart = [];
                        renderCart();
                        if (customerInputs[0]) customerInputs[0].value = '';
                        if (customerInputs[1]) customerInputs[1].value = '';
                        if (customerInputs[2]) customerInputs[2].value = 'BILL-' + Math.floor(100 + Math.random() * 900);
                        
                        // Deduct from local array to prevent overselling before refresh
                        data.bill.items.forEach(soldItem => {
                            const p = availableProducts.find(p => p.name === soldItem.name);
                            if (p) p.qty -= soldItem.qty;
                        });
                        
                    } else {
                        alert('Failed to save bill');
                    }
                })
                .catch(err => {
                    console.log(err);
                    alert('Error creating bill');
                });
            });
        }
    }

    // 5. BILL HISTORY LOGIC
    const historyTable = document.querySelector('.history table');
    if (historyTable) {
        fetch('/api/bills')
            .then(res => res.json())
            .then(bills => {
                historyTable.innerHTML = `
                    <tr>
                        <th>Bill No.</th>
                        <th>Customer Name</th>
                        <th>Mobile</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Action</th>
                    </tr>
                `;
                bills.forEach(bill => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${bill.billNo}</td>
                        <td>${bill.customerName}</td>
                        <td>${bill.mobile || 'N/A'}</td>
                        <td>${bill.date || new Date().toLocaleDateString()}</td>
                        <td>₹${bill.amount}</td>
                        <td><button onclick="alert('Bill #${bill.billNo} for ${bill.customerName}: ₹${bill.amount}')">View</button></td>
                    `;
                    historyTable.appendChild(row);
                });
            })
            .catch(err => console.log(err));
    }
});
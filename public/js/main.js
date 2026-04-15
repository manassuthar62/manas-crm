document.addEventListener('DOMContentLoaded', () => {
    const orderForm = document.getElementById('orderForm');
    const trackBtn = document.getElementById('trackBtn');
    const trackingIdInput = document.getElementById('trackingId');
    const trackingResult = document.getElementById('trackingResult');

    // Handle Order Submission
    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(orderForm);
            
            try {
                const response = await fetch('/api/orders/create', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    alert(`Order placed! Your Order ID is ${data.orderId}. Queue Number: ${data.queueNumber}`);
                    orderForm.reset();
                    // Optional: Redirect to tracking or show success message on UI
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred while placing the order.');
            }
        });
    }

    // Handle Tracking
    if (trackBtn) {
        trackBtn.addEventListener('click', async () => {
            const id = trackingIdInput.value.trim();
            if (!id) return alert('Please enter an Order ID');

            try {
                const response = await fetch(`/api/orders/track/${id}`);
                const data = await response.json();

                if (data.success) {
                    trackingResult.style.display = 'block';
                    document.getElementById('statusText').innerText = `Status: ${data.status}`;
                    document.getElementById('queueText').innerText = `Your Queue Number: #${data.queueNumber}`;
                    
                    // Show ETA
                    const etaDate = new Date(data.eta).toLocaleString();
                    const etaElement = document.createElement('p');
                    etaElement.style.fontSize = '0.9rem';
                    etaElement.style.marginTop = '10px';
                    etaElement.innerHTML = `<i class="far fa-clock"></i> Estimated Delivery: <strong>${etaDate}</strong>`;
                    
                    const existingEta = trackingResult.querySelector('.eta-info');
                    if (existingEta) existingEta.remove();
                    etaElement.classList.add('eta-info');
                    trackingResult.appendChild(etaElement);

                } else {
                    alert('Order not found or invalid ID');
                    trackingResult.style.display = 'none';
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred during tracking.');
            }
        });
    }
});

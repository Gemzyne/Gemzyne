import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage/HomePage';
import ReviewsPage from './pages/ReviewsPage/ReviewsPage';
import AddReviewPage from './pages/AddReviewPage/AddReviewPage';
import AddComplaintPage from "./pages/AddComplaintPage/AddComplaintPage";  
import CartPage from "./pages/CartPage/CartPage";
import MyOrdersPage from "./pages/MyOrdersPage/MyOrdersPage";
import SellerOrdersPage from "./pages/SellerOrdersPage/SellerOrdersPage";

function App() {
  return (
    
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/add-review" element={<AddReviewPage />} />
        <Route path="/add-complaint" element={<AddComplaintPage />} />   
        <Route path="/cart" element={<CartPage />} />
        <Route path="/my-orders" element={<MyOrdersPage />} />
        <Route path="/seller/orders" element={<SellerOrdersPage />} />
      </Routes>
    
  );
}

export default App;



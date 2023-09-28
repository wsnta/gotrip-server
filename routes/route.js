const express = require('express')
const router = express.Router()
const Auth = require('../controller/auth')
const Booking = require('../controller/booking')
const Transaction = require('../controller/transaction')
const User = require('../controller/user')
const MinPrice = require('../controller/listMinPrice')
const checkRole = require('../middlewares/checkRole');
const Fee = require('../controller/fee')

router.post('/login', Auth.login)
router.post('/register', Auth.register)
router.post('/google-login', Auth.googleLogin);
router.post('/get-log-auto', Auth.getLogAuto);
router.post('/log-auto', Auth.logAuto);
router.post('/token', Auth.refresh)
router.post('/logout', Auth.logout)
router.put('/update-account', Auth.updateAccount);
router.post('/create-agent', checkRole('admin'), Auth.createAgent);
router.put('/update-agent', checkRole('admin'), Auth.updateAgent);
router.get('/all-agent', Auth.getAllAgentInf);

//Up
router.post('/get-booking', Booking.getUserBookings);
router.delete('/delete-booking/:userId/:bookingId', Booking.deleteBooking);
router.post('/post-booking', Booking.postBooking);
router.post('/post-booking-no-user', Booking.postBookingNoUser)
router.put('/payment-status', Booking.updatePaymentStatus);
router.get('/get-all-bookings', Booking.getAllBookings);
router.get('/get-booking-detail/:bookingId', Booking.getBookingDetails);
router.post('/get-booking-by-email', Booking.getAllBookingsByEmail);
router.post('/issue-ticket', Booking.exportTicket);
router.put('/update-ticket-status', Booking.updateTicketingStatus)
router.delete('/delete-by-admin/:bookingId', Booking.deleteBookingById)
router.get('/invoice-request', Booking.getInvoice)

router.post('/updateListPrice', MinPrice.updateListPrice)
router.get('/list-price', MinPrice.getListPrice);

router.get('/getTransactionData', Transaction.getTransactions);
router.get('/get-user-inf/:userId', User.getUserInf);
router.put('/update-fee-by-agent', User.updateFeeAgent);
router.put('/update-user-inf', User.updateUserInf)

router.put('/update-fee', Fee.updateFee);
router.get('/get-fee', Fee.getFeeValues);

module.exports = router
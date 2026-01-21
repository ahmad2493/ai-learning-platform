// const nodemailer = require('nodemailer');

// // Configure email transporter (using Gmail as example)
// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER, // Your email
//         pass: process.env.EMAIL_PASSWORD // Your email password or app password
//     }
// });

// // Send OTP Email
// const sendOTPEmail = async (email, otp, purpose) => {
//     try {
//         const subject = purpose === 'REGISTRATION' 
//             ? 'Email Verification - OTP Code' 
//             : 'Password Reset - OTP Code';
        
//         const message = purpose === 'REGISTRATION'
//             ? `Your OTP for email verification is: ${otp}\n\nThis OTP will expire in 60 seconds.`
//             : `Your OTP for password reset is: ${otp}\n\nThis OTP will expire in 60 seconds.`;

//         const mailOptions = {
//             from: process.env.EMAIL_USER,
//             to: email,
//             subject: subject,
//             text: message,
//             html: `
//                 <div style="font-family: Arial, sans-serif; padding: 20px;">
//                     <h2>${subject}</h2>
//                     <p>Your OTP code is:</p>
//                     <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
//                     <p style="color: #f44336;">This OTP will expire in 60 seconds.</p>
//                     <p>If you didn't request this, please ignore this email.</p>
//                 </div>
//             `
//         };

//         await transporter.sendMail(mailOptions);
//         return { success: true, message: 'OTP sent successfully' };
//     } catch (error) {
//         console.error('Email sending error:', error);
//         throw new Error('Failed to send OTP email: ' + error.message);
//     }
// };

// module.exports = {
//     sendOTPEmail
// };


const nodemailer = require('nodemailer');

// Configure email transporter (using Gmail as example)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASSWORD // Your email password or app password
    }
});

// Verify transporter on startup
transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ [EMAIL SERVICE] Transporter verification failed:', error);
    } else {
        console.log('✅ [EMAIL SERVICE] Email server is ready to send messages');
        console.log('📧 [EMAIL SERVICE] Using email:', process.env.EMAIL_USER);
    }
});

// Send OTP Email
const sendOTPEmail = async (email, otp, purpose) => {
    try {
        console.log('📧 [EMAIL SERVICE] Starting to send OTP email...');
        console.log('📧 [EMAIL SERVICE] Recipient:', email);
        console.log('📧 [EMAIL SERVICE] OTP:', otp);
        console.log('📧 [EMAIL SERVICE] Purpose:', purpose);
        console.log('📧 [EMAIL SERVICE] From:', process.env.EMAIL_USER);
        
        const subject = purpose === 'REGISTRATION' 
            ? 'Email Verification - OTP Code' 
            : 'Password Reset - OTP Code';
        
        const message = purpose === 'REGISTRATION'
            ? `Your OTP for email verification is: ${otp}\n\nThis OTP will expire in 30 seconds.`  // ✅ FIXED: Changed from 60 to 30
            : `Your OTP for password reset is: ${otp}\n\nThis OTP will expire in 30 seconds.`;  // ✅ FIXED: Changed from 60 to 30

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: subject,
            text: message,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>${subject}</h2>
                    <p>Your OTP code is:</p>
                    <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
                    <p style="color: #f44336;">⏰ This OTP will expire in 30 seconds.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            `
        };

        console.log('📧 [EMAIL SERVICE] Mail options prepared, sending...');
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ [EMAIL SERVICE] Email sent successfully!');
        console.log('✅ [EMAIL SERVICE] Message ID:', info.messageId);
        console.log('✅ [EMAIL SERVICE] Response:', info.response);
        
        return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
        console.error('❌ [EMAIL SERVICE] Email sending error:', error);
        console.error('❌ [EMAIL SERVICE] Error details:', {
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode
        });
        throw new Error('Failed to send OTP email: ' + error.message);
    }
};

module.exports = {
    sendOTPEmail
};
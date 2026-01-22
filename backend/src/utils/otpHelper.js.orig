// const crypto = require('crypto');
// const Otp = require('../models/Otp');

// // Generate 6-digit OTP
// const generateOTP = () => {
//     return crypto.randomInt(100000, 999999).toString();
// };

// // Create and save OTP
// const createOTP = async (userId, email, otpType) => {
//     try {
//         // Invalidate any existing OTPs for this user and type
//         await Otp.updateMany(
//             { 
//                 user_id: userId, 
//                 otp_type: otpType,
//                 is_used: false 
//             },
//             { 
//                 is_used: true 
//             }
//         );

//         // Generate new OTP
//         const otp = generateOTP();
        
//         // Set expiry to 30 seconds from now
//         const expiresAt = new Date(Date.now() + 30 * 1000);

//         // Save OTP to database
//         const otpRecord = new Otp({
//             user_id: userId,
//             email: email,
//             otp: otp,
//             otp_type: otpType,
//             expires_at: expiresAt
//         });

//         await otpRecord.save();
        
//         return otp;
//     } catch (error) {
//         throw new Error('Error creating OTP: ' + error.message);
//     }
// };

// // Verify OTP
// const verifyOTP = async (email, otp, otpType) => {
//     try {
//         const otpRecord = await Otp.findOne({
//             email: email,
//             otp: otp,
//             otp_type: otpType,
//             is_used: false,
//             expires_at: { $gt: new Date() }
//         });

//         if (!otpRecord) {
//             return { success: false, message: 'Invalid or expired OTP' };
//         }

//         // Mark OTP as used
//         otpRecord.is_used = true;
//         await otpRecord.save();

//         return { success: true, userId: otpRecord.user_id };
//     } catch (error) {
//         throw new Error('Error verifying OTP: ' + error.message);
//     }
// };

// module.exports = {
//     generateOTP,
//     createOTP,
//     verifyOTP
// };

const crypto = require('crypto');
const Otp = require('../models/Otp');

// Generate 6-digit OTP
const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// Create and save OTP
const createOTP = async (userId, email, otpType) => {
    try {
        console.log('🔹 [OTP HELPER] Creating OTP...');
        console.log('🔹 [OTP HELPER] userId:', userId);
        console.log('🔹 [OTP HELPER] email:', email);
        console.log('🔹 [OTP HELPER] otpType:', otpType);
        
        // Invalidate any existing OTPs for this user and type
        const invalidated = await Otp.updateMany(
            { 
                user_id: userId, 
                otp_type: otpType,
                is_used: false 
            },
            { 
                is_used: true 
            }
        );
        console.log('🔹 [OTP HELPER] Invalidated old OTPs:', invalidated.modifiedCount);

        // Generate new OTP
        const otp = generateOTP();
        console.log('✅ [OTP HELPER] Generated OTP:', otp);
        
        // Set expiry to 30 seconds from now
        const expiresAt = new Date(Date.now() + 60 * 1000);
        console.log('⏰ [OTP HELPER] OTP expires at:', expiresAt);

        // Save OTP to database
        const otpRecord = new Otp({
            user_id: userId,
            email: email,
            otp: otp,
            otp_type: otpType,
            expires_at: expiresAt
        });

        console.log('💾 [OTP HELPER] Saving OTP to database...');
        await otpRecord.save();
        console.log('✅ [OTP HELPER] OTP saved successfully to database');
        
        return otp;
    } catch (error) {
        console.error('❌ [OTP HELPER] Error creating OTP:', error);
        console.error('❌ [OTP HELPER] Error details:', error.message);
        throw new Error('Error creating OTP: ' + error.message);
    }
};

// Verify OTP
const verifyOTP = async (email, otp, otpType) => {
    try {
        console.log('🔐 [OTP HELPER] Verifying OTP...');
        console.log('🔐 [OTP HELPER] email:', email);
        console.log('🔐 [OTP HELPER] otp:', otp);
        console.log('🔐 [OTP HELPER] otpType:', otpType);
        
        const otpRecord = await Otp.findOne({
            email: email,
            otp: otp,
            otp_type: otpType,
            is_used: false,
            expires_at: { $gt: new Date() }
        });

        if (!otpRecord) {
            console.log('❌ [OTP HELPER] No valid OTP found');
            
            // Debug: Check what OTPs exist for this email
            const allOtps = await Otp.find({ email: email, otp_type: otpType });
            console.log('🔍 [OTP HELPER] All OTPs for this email:', allOtps);
            
            return { success: false, message: 'Invalid or expired OTP' };
        }

        console.log('✅ [OTP HELPER] Valid OTP found');

        // Mark OTP as used
        otpRecord.is_used = true;
        await otpRecord.save();
        console.log('✅ [OTP HELPER] OTP marked as used');

        return { success: true, userId: otpRecord.user_id };
    } catch (error) {
        console.error('❌ [OTP HELPER] Error verifying OTP:', error);
        throw new Error('Error verifying OTP: ' + error.message);
    }
};

module.exports = {
    generateOTP,
    createOTP,
    verifyOTP
};
const nodemailer = require('nodemailer');

async function sendEmail(email, message) {
  // Replace with your own email and app password
  const userEmail = process.env.USER_EMAIL;
  const userPassword = process.env.USER_PASSWORD;

  const transporter = nodemailer.createTransport({
    service: 'gmail', // you can use other email services like Yahoo or Outlook
    auth: {
      user: userEmail,
      pass: userPassword
    }
  });

  const mailOptions = {
    from: email,
    to: userEmail,
    subject: 'Contact Form Submission',
    text: message
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully.');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

module.exports = sendEmail;

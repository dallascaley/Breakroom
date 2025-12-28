const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendMail = async (to, from, subject, htmlContent) => {
  const msg = {
    to: to,
    from: from,
    subject: subject,
    html: htmlContent,
  };

  console.log('Attempting to send email to:', to);

  try {
    await sgMail.send(msg);
    console.log('Email sent successfully to:', to);
    return { status: 200, message: 'Email sent successfully!' };
  } catch (error) {
    console.error('SendGrid error:', error.message);
    if (error.response) {
      console.error('SendGrid response body:', error.response.body);
    }
    return { status: 500, message: 'Error sending email: ' + error.message };
  }
}

module.exports = {
  sendMail
};
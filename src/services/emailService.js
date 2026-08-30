import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export async function sendWaitingTimeAlert(pharmacist, branch, waitingTime, recipients) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipients.join(', '),
      subject: `⚠️ URGENT: Waiting Time Alert - ${branch.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f97316; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0;">⚠️ Waiting Time Alert</h2>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 10px 0;"><strong>Branch:</strong> ${branch.name}</p>
            <p style="margin: 10px 0;"><strong>Pharmacist:</strong> ${pharmacist.name}</p>
            <p style="margin: 10px 0;"><strong>Waiting Time:</strong> <span style="color: #dc2626; font-weight: bold;">${waitingTime} minutes</span></p>
            <p style="margin: 10px 0;"><strong>Threshold:</strong> 5 minutes</p>
            <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #dc2626;">EXCEEDED</span></p>
          </div>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #991b1b;"><strong>Action Required:</strong></p>
            <p style="margin: 10px 0; color: #991b1b;">Please take immediate action to reduce waiting time.</p>
            <ul style="color: #991b1b; margin: 10px 0;">
              <li>Add more staff if available</li>
              <li>Prioritize urgent cases</li>
              <li>Optimize workflow</li>
            </ul>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #6b7280;">
            <p>This is an automated alert from FalconMed Elite Dashboard</p>
            <p>Timestamp: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Alert email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Email sending error:', error);
    throw error;
  }
}

export async function sendDailySummary(branch, metrics, recipients) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipients.join(', '),
      subject: `📊 Daily Summary - ${branch.name} - ${new Date().toDateString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0;">📊 Daily Analytics Summary</h2>
            <p style="margin: 5px 0; opacity: 0.9;">${branch.name}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; border-radius: 4px;">
              <p style="margin: 0; color: #0c4a6e; font-size: 12px; font-weight: bold;">Total Patients</p>
              <p style="margin: 10px 0; color: #0284c7; font-size: 24px; font-weight: bold;">${metrics.totalPatients}</p>
            </div>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px;">
              <p style="margin: 0; color: #064e3b; font-size: 12px; font-weight: bold;">Serve Rate</p>
              <p style="margin: 10px 0; color: #10b981; font-size: 24px; font-weight: bold;">${metrics.serveRate}%</p>
            </div>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-size: 12px; font-weight: bold;">Avg Waiting Time</p>
              <p style="margin: 10px 0; color: #f59e0b; font-size: 24px; font-weight: bold;">${metrics.avgWaitingTime}m</p>
            </div>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #8b5cf6; padding: 15px; border-radius: 4px;">
              <p style="margin: 0; color: #5b21b6; font-size: 12px; font-weight: bold;">Avg Service Time</p>
              <p style="margin: 10px 0; color: #8b5cf6; font-size: 24px; font-weight: bold;">${metrics.avgServiceTime}m</p>
            </div>
          </div>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 10px 0;"><strong>Identified Patients:</strong> ${metrics.identifiedPatients}</p>
            <p style="margin: 10px 0;"><strong>Unidentified Patients:</strong> ${metrics.unidentifiedPatients}</p>
            <p style="margin: 10px 0;"><strong>No-Show Rate:</strong> ${metrics.noShowRate}%</p>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #6b7280;">
            <p>End of day summary - FalconMed Elite Dashboard</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Summary email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Email sending error:', error);
    throw error;
  }
}

export function testEmailConfiguration() {
  return transporter.verify();
}

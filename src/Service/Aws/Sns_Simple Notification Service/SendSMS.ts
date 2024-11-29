import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
export default class Sns_service {
  sendSms = async ({ phone, message }: { phone: string; message: string }) => {
    const command = new PublishCommand({
      Message: message,
      PhoneNumber: phone,
      MessageAttributes: {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional",
        },
        "AWS.SNS.SMS.SenderID": {
          DataType: "String",
          StringValue: process.env.SMS_SENDER_ID_AWS,
        },
      },
    });
    try {
      const response = await snsClient.send(command);
      console.log("SMS sent successfully:", response);
      return response;
    } catch (error:any) {
      console.error("Error sending SMS:", error);
      throw new Error(`Error sending SMS: ${error.message || 'Unknown error'}`);
    }
  };
}
export const sendSMS = async (phone: string, activeCode: string) => {
  const aws_s3_service = new Sns_service();
  const sendSms = await aws_s3_service.sendSms({
    phone,
    message: `Your OTP is ${activeCode}. This code is valid for 15 minutes.`,
  });
  return sendSms;
};

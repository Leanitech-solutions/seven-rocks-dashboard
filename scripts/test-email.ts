import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { verifyEmailTransport, getEmailTransporterInfo } from '../lib/email';

async function main() {
  console.log('----------------------------------------------------');
  console.log('📧 Seven Rocks Email Configuration Diagnostics');
  console.log('----------------------------------------------------');
  
  try {
    const info = getEmailTransporterInfo();
    console.log(`• Transport Type : ${info.type}`);
    console.log(`• Sender / User  : ${info.user}`);
    console.log(`• From Header    : ${info.fromEmail}`);
    console.log('----------------------------------------------------');

    const result = await verifyEmailTransport();
    console.log('Verification Result:', result);

    if (result.verified) {
      console.log('✅ Gmail transport is ready to send live emails!');
    } else {
      console.log('⚠️ Transport configured but connection test failed:', result.error);
    }
  } catch (err: any) {
    console.error('❌', err.message);
  }
}

main().catch(console.error);


import puppeteer from 'puppeteer';
import fs from 'fs';

// Create a dummy pdf
const base64Pdf = 'JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLdnBwAAA/oXkCmVuZHN0cmVhbQplbmRvYmoKCjMgMCBvYmoKMTcKZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgNTk1IDg0Ml0vUGFyZW50IDUgMCBSL1Jlc291cmNlczw8L1Byb2NTZXRbL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSV0vRXh0R1N0YXRlPDwvRzMgNiAwIFI+Pi9Gb250PDwvRjQgNyAwIFI+Pj4+L0NvbnRlbnRzIDIgMCBSPj4KZW5kb2JqCgo1IDAgb2JqCjw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWzQgMCBSXT4+CmVuZG9iagoKNyAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2EvRW5jb2RpbmcvV2luQW5zaUVuY29kaW5nPj4KZW5kb2JqCgo2IDAgb2JqCjw8L1R5cGUvRXh0R1N0YXRlL0JNL05vcm1hbC9jYSAxPj4KZW5kb2JqCgoxIDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyA1IDAgUj4+CmVuZG9iagoKOCAwIG9iago8PC9Qcm9kdWNlcihqc3BkZiAxLjAuMCkvQ3JlYXRpb25EYXRlKEQ6MjAyNDA0MDEwMDAwMDBaKT4+CmVuZG9iagoKeHJlZgowIDkKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwNDE3IDAwMDAwIG4gCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA4OCAwMDAwMCBuIAowMDAwMDAwMTA5IDAwMDAwIG4gCjAwMDAwMDAyNjAgMDAwMDAgbiAKMDAwMDAwMDM2OCAwMDAwMCBuIAowMDAwMDAwMzE5IDAwMDAwIG4gCjAwMDAwMDA0NjkgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDkvUm9vdCAxIDAgUi9JbmZvIDggMCBSPj4Kc3RhcnR4cmVmCjU2MgolJUVPRgo=';
fs.writeFileSync('dummy.pdf', Buffer.from(base64Pdf, 'base64'));

(async () => {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  console.log('Navigating to local dev server...');
  await page.goto('http://localhost:5173');

  console.log('Waiting for uploader...');
  const fileInput = await page.$('input[type=file]');
  
  if (!fileInput) {
    console.log('Could not find file input!');
    await browser.close();
    return;
  }
  
  console.log('Uploading dummy.pdf...');
  await fileInput.uploadFile('dummy.pdf');

  console.log('Waiting to see if it crashes...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('Done.');
  await browser.close();
})();

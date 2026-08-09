fetch('http://localhost:3000/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ message: "Hello", sessionId: "test" })
}).then(async res => {
  console.log("Status:", res.status);
  console.log("Headers:", res.headers);
  const text = await res.text();
  console.log("Body:", text);
}).catch(console.error);

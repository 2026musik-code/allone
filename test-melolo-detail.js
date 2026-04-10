async function test() {
  const apiKey = "dedi131";
  const bookId = "7523157106925505552"; // From previous search
  const urls = [
    `https://api.ferdev.my.id/internet/melolo/detail?book_id=${bookId}&apikey=${apiKey}`,
    `https://api.ferdev.my.id/internet/melolo/detail?id=${bookId}&apikey=${apiKey}`,
    `https://api.ferdev.my.id/internet/melolo/detail?url=${bookId}&apikey=${apiKey}`
  ];

  for (const url of urls) {
    try {
      console.log("Testing:", url);
      const res = await fetch(url);
      const data = await res.json();
      console.log("Result:", JSON.stringify(data, null, 2));
    } catch (e) {
      console.log("Error:", e.message);
    }
  }
}
test();

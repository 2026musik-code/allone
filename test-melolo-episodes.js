async function test() {
  const apiKey = "dedi131";
  const bookId = "7523157106925505552"; // From previous search
  const urls = [
    `https://api.ferdev.my.id/internet/melolo/episodes?book_id=${bookId}&apikey=${apiKey}`,
    `https://api.ferdev.my.id/internet/melolo/detail?book_id=${bookId}&apikey=${apiKey}`,
    `https://api.ferdev.my.id/internet/melolo/episode?book_id=${bookId}&apikey=${apiKey}`,
    `https://api.ferdev.my.id/internet/melolo/stream?videoId=${bookId}&apikey=${apiKey}`
  ];

  for (const url of urls) {
    try {
      console.log("Testing:", url);
      const res = await fetch(url);
      const data = await res.json();
      console.log("Result:", data.success ? "Success" : "Failed", data.status);
      if (data.success) {
        console.log("Keys:", Object.keys(data));
        if (data.result) {
           console.log("Result sample:", Array.isArray(data.result) ? data.result[0] : data.result);
        }
      }
    } catch (e) {
      console.log("Error:", e.message);
    }
  }
}
test();

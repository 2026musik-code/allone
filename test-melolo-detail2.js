async function test() {
  const apiKey = "dedi131";
  const bookId = "7523157106925505552"; // From previous search
  const url = `https://api.ferdev.my.id/internet/melolo/detail?bookId=${bookId}&apikey=${apiKey}`;

  try {
    console.log("Testing:", url);
    const res = await fetch(url);
    const data = await res.json();
    console.log("Result:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();

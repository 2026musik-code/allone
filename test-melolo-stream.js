async function test() {
  const apiKey = "dedi131";
  const url = "https://api.ferdev.my.id/internet/melolo/stream?videoId=7553857697536281661&apikey=" + apiKey;

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

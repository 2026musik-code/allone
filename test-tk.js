async function test() {
  const apiKey = "dedi131";
  const url = `https://api.ferdev.my.id/search/tiktok?query=pargoy&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data.result[0], null, 2));
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();

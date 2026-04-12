async function test() {
  const apiKey = "dedi131";
  try {
    const res = await fetch(`https://api.ferdev.my.id/search/tiktok?query=pargoy&apikey=${apiKey}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();

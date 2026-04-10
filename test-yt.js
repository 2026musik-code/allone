async function test() {
  const apiKey = "dedi131";
  const url = `https://api.ferdev.my.id/search/youtube?query=love&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2).substring(0, 1500));
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();

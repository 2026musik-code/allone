async function test() {
  const apiKey = "dedi131";
  const url = `https://api.ferdev.my.id/downloader/tiktok?link=https://vt.tiktok.com/ZS6EMauTA/&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();

async function test() {
  const apiKey = "dedi131";
  const url = `https://api.ferdev.my.id/downloader/allinone?link=https://www.tiktok.com/@tiktok/video/7106594312292453675&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();

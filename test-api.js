async function test() {
  const url = "https://api.ferdev.my.id/downloader/allinone?link=https://www.facebook.com/watch/?v=10156034138111729&apikey=dedi131";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json"
      }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log("Error", e);
  }
}
test();

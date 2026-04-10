async function test() {
  const apiKey = "dedi131";
  const queries = [
    "https://api.ferdev.my.id/internet/melolo/search?query=cinta&apikey=" + apiKey,
    "https://api.ferdev.my.id/search/melolo?query=cinta&apikey=" + apiKey,
    "https://api.ferdev.my.id/internet/melolo?query=cinta&apikey=" + apiKey
  ];

  for (const url of queries) {
    try {
      console.log("Testing:", url);
      const res = await fetch(url);
      const data = await res.json();
      console.log("Result:", data.success ? "Success" : "Failed", data);
    } catch (e) {
      console.log("Error:", e.message);
    }
  }
}
test();

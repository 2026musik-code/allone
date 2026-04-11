async function test() {
  const apiKey = "dedi131";
  const categories = ["Terbaru", "Terpopuler", "Family"];
  try {
    const promises = categories.map(cat => 
      fetch(`https://api.ferdev.my.id/internet/melolo/search?query=${encodeURIComponent(cat)}&apikey=${apiKey}`).then(res => res.json())
    );
    const results = await Promise.all(promises);
    results.forEach((res, i) => {
      console.log(`Category ${categories[i]}: ${res.result?.length || 0} items`);
    });
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();

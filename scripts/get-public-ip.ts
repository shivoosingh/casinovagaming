async function main() {
  const res = await fetch("https://api.ipify.org?format=json");
  const data = await res.json();
  console.log("Current Server Public IP:", data.ip);
}

main().catch(console.error);

const {createJiti}=require('jiti');const j=createJiti(__filename);
const {TEMPLATE_ART}=j('./resources/js/templates/templateArt.ts');
const fs=require('fs');let s=fs.readFileSync('database/seeders/DatabaseSeeder.php','utf8');let n=0;
for(const [key,a] of Object.entries(TEMPLATE_ART)){
  const p=a.palette;
  const re=new RegExp("(\['key' => '"+key+"'[\s\S]{0,600}?'palette' => \[)[^\]]+(\])");
  const rep="'primary' => '"+p.primary+"', 'secondary' => '"+p.secondary+"', 'accent' => '"+p.accent+"', 'bg' => '"+p.bg+"', 'text' => '"+p.text+"'";
  if(re.test(s)){s=s.replace(re,(m,a1,a2)=>a1+rep+a2);n++;}else{console.log('  no match:',key);}
}
fs.writeFileSync('database/seeders/DatabaseSeeder.php',s);
console.log('palettes updated:',n);

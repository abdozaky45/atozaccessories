import bcrypt from "bcrypt";
async function hashActiveCode(code: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  const hashedCode= await bcrypt.hashSync(code, salt);
  return hashedCode;
}
async function compareActiveCode(code: string, hashedCode: string): Promise<boolean> {
  const isMatch = await bcrypt.compare(code, hashedCode);  
  return isMatch;
}

export { hashActiveCode, compareActiveCode };

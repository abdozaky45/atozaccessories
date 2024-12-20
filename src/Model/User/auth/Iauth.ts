export default interface Iauth {
  email: string;
  activeCode: string;
  isConfirmed: boolean;
  status: string;
  role: string;
  codeCreatedAt: number;
}

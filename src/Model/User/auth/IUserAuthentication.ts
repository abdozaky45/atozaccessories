export default interface IUserAuthentication {
  email: string;
  activeCode: string;
  isConfirmed: boolean;
  status: string;
  role: string;
  codeCreatedAt: number;
}

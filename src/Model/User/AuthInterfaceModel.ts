export default interface AuthInterfaceModel {
  email: string;
  phone: string;
  activeCode: string;
  isConfirmed: boolean;
  status: string;
  role: string;
  codeCreatedAt: number;
}

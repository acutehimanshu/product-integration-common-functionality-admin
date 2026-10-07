import { Route, Routes } from "react-router"
import { UserList } from "@/modules/users/user-list"
import { UserAccount } from "@/modules/users/user-account"

/** Users: search every account, and one account's page. */
export default function UsersPage() {
  return (
    <Routes>
      <Route index element={<UserList />} />
      <Route path=":id" element={<UserAccount />} />
    </Routes>
  )
}

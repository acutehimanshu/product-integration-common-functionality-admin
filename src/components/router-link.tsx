import { Link } from "react-router"
import type { HrefLink } from "@acutehimanshu/ui/components/stat-card"

/** React Router's Link for shared components that expect an `href` link. */
export const RouterLink: HrefLink = ({ href, ...props }) => <Link to={href} {...props} />

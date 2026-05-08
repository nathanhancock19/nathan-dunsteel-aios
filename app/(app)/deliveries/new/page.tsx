import { NewDeliveryForm } from "@/components/deliveries/NewDeliveryForm"
import Link from "next/link"

export default function NewDeliveryPage() {
  return (
    <div className="max-w-md">
      <div className="mb-6">
        <Link href="/deliveries" className="text-xs text-neutral-500 hover:text-neutral-300">
          Back to deliveries
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-neutral-100">Add delivery</h1>
      </div>
      <NewDeliveryForm />
    </div>
  )
}

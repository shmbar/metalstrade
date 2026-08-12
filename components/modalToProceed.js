"use client"

import { useContext } from "react"
import { SettingsContext } from "../contexts/useSettingsContext"
import { getTtl } from "../utils/languages"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@components/ui/dialog"

const MyModal = ({ isDeleteOpen, setIsDeleteOpen, ttl, txt, doAction }) => {
  const { compData } = useContext(SettingsContext)
  const ln = compData.lng

  const closeModal = () => {
    setIsDeleteOpen(false)
  }

  const confirmDel = () => {
    closeModal()
    doAction()
  }

  return (
    <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[var(--endeavour)]">
            {ttl}
          </DialogTitle>
        </DialogHeader>

        <p className="responsiveTextTitle text-[var(--endeavour)] mt-2">
          {txt}
        </p>

        <DialogFooter className="flex gap-4 mt-4">
          <button
            onClick={confirmDel}
            className="inline-flex justify-center rounded-lg bg-[var(--endeavour)] px-4 py-1.5 responsiveTextTitle font-medium text-[var(--on-brand)] hover:opacity-90 transition-all"
          >
            {getTtl("Confirm", ln)}
          </button>

          <button
            onClick={closeModal}
            className="inline-flex justify-center rounded-lg border border-[var(--endeavour)] bg-[var(--bg-card)] px-4 py-1.5 responsiveTextTitle font-medium text-[var(--endeavour)] hover:bg-[var(--selago)] transition-all"
          >
            {getTtl("Cancel", ln)}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MyModal

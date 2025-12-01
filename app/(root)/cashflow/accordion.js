import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const MyAccordion = ({ title, children }) => {
  return (
    <Accordion type="single" collapsible className="w-full ">
      <AccordionItem value="item-1" className='border-b-0'>
        <AccordionTrigger className='py-0 px-1 hover:no-underline hover:bg-slate-200 cursor-pointer rounded-lg'>{title}</AccordionTrigger>
        <AccordionContent>
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export default MyAccordion;
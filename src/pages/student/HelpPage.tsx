import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Mail, ChevronDown, ChevronUp, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: 'How do I place an order?',
    answer: 'Select a shop from the main catalog, choose the items you want, adjust the quantity, review your cart, select your dormitory/location, select payment method, and click Place Order.',
  },
  {
    question: 'How much is the delivery fee?',
    answer: 'The delivery fee is typically flat-rate depending on the distance between the shop and your dorm/classroom, starting from 15 ETB. You can see the fee breakdown at checkout.',
  },
  {
    question: 'How can I become a runner?',
    answer: 'Log out of your current account, go to the Sign Up screen, select the "Runner" role, fill in your information (including your phone and university), and create your account to start accepting delivery requests.',
  },
  {
    question: 'Can I pay using my wallet balance?',
    answer: 'Yes! You can load funds into your Uni Gebeya wallet via card or local bank transfers, and then instantly check out with a single click using your wallet balance.',
  },
  {
    question: 'My order is late or wrong, what do I do?',
    answer: 'You can use the active order tracking view to get the contact info of the runner assigned to your delivery, or fill out the support form below to submit a complaint ticket.',
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [ticket, setTicket] = useState({
    subject: '',
    category: 'order',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket.subject.trim() || !ticket.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    // Simulate sending ticket
    setSubmitted(true);
    toast.success('Your support ticket has been submitted!');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Help & Support" showBack />

      <div className="px-4 py-4 max-w-md mx-auto space-y-6">
        {/* Contact Info Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-card border shadow-card grid grid-cols-2 gap-3"
        >
          <div className="p-4 rounded-xl bg-primary/5 border flex flex-col items-center justify-center text-center">
            <Phone className="w-6 h-6 text-primary mb-2" />
            <span className="text-xs font-semibold text-muted-foreground">Call Hotline</span>
            <a href="tel:+251912345678" className="text-sm font-bold text-primary mt-1">
              +251 912 345 678
            </a>
          </div>

          <div className="p-4 rounded-xl bg-primary/5 border flex flex-col items-center justify-center text-center">
            <Mail className="w-6 h-6 text-primary mb-2" />
            <span className="text-xs font-semibold text-muted-foreground">Email Support</span>
            <a href="mailto:support@unigebeya.com" className="text-sm font-bold text-primary mt-1 truncate max-w-full">
              support@unigebeya.com
            </a>
          </div>
        </motion.div>

        {/* FAQs */}
        <div className="space-y-3">
          <h2 className="font-bold text-lg">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border bg-card overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 flex justify-between items-center text-left gap-4 font-semibold text-sm hover:bg-muted/30"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden border-t"
                      >
                        <p className="p-4 text-xs text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Support Ticket Form */}
        <div className="space-y-3">
          <h2 className="font-bold text-lg">Submit a Complaint / Request</h2>

          {submitted ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-6 rounded-2xl bg-success/5 border border-success/20 text-center space-y-3"
            >
              <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
              <h3 className="font-bold text-base">Ticket Received!</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Thank you for contacting Uni Gebeya Support. We have logged your request and our helpdesk team will respond via email/SMS shortly.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mx-auto"
                onClick={() => {
                  setSubmitted(false);
                  setTicket({ subject: '', category: 'order', message: '' });
                }}
              >
                Submit another request
              </Button>
            </motion.div>
          ) : (
            <motion.form
              onSubmit={handleSubmit}
              className="p-5 rounded-2xl bg-card border shadow-card space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Category</label>
                <select
                  value={ticket.category}
                  onChange={(e) => setTicket({ ...ticket, category: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="order">Order Issues</option>
                  <option value="payment">Payments & Refund</option>
                  <option value="runner">Runner Behavior</option>
                  <option value="technical">App Bug/Technical</option>
                  <option value="other">Other Inquiry</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Subject</label>
                <Input
                  type="text"
                  placeholder="e.g. Order delivered to wrong dorm"
                  value={ticket.subject}
                  onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Describe your issue</label>
                <Textarea
                  placeholder="Please give details, order ID (if applicable), and dorm number..."
                  value={ticket.message}
                  onChange={(e) => setTicket({ ...ticket, message: e.target.value })}
                  rows={4}
                  maxLength={500}
                  required
                />
              </div>

              <Button type="submit" variant="gradient" className="w-full h-12 flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> Send Ticket
              </Button>
            </motion.form>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

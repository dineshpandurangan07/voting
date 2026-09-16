import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lock, CheckCircle2, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { electionsAPI, votesAPI } from '../api/api';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Loading from '../components/common/Loading';
import ErrorState from '../components/common/ErrorState';

function VotingPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [election, setElection] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('select');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [electionRes, historyRes] = await Promise.all([
          electionsAPI.getOne(id),
          votesAPI.getHistory(),
        ]);
        setElection(electionRes.data.data);
        setHistory(historyRes.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load election');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const alreadyVoted = history.some((v) => v.election?._id === id);
  const approvedCandidates = election?.candidates?.filter((c) => c.status === 'approved') || [];

  const handleSelect = (candidate) => {
    setSelectedCandidate(candidate);
    setStep('review');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await votesAPI.cast({ electionId: id, candidateId: selectedCandidate._id });
      setReceipt(res.data.data);
      setStep('confirm');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cast vote');
      setStep('select');
      setSelectedCandidate(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading text="Loading election..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  if (!election) return <ErrorState message="Election not found" />;

  if (election.status !== 'ongoing') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
          <Lock size={28} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Voting Closed</h2>
        <p className="text-sm text-gray-500 mb-2">This election is currently <span className="font-medium">{election.status}</span>.</p>
        <StatusBadge status={election.status} className="mb-6" />
        <div className="flex items-center gap-3">
          <Link to="/voter-dashboard" className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <Link to="/elections" className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">
            View Elections
          </Link>
        </div>
      </div>
    );
  }

  if (alreadyVoted && step !== 'confirm') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
          <ShieldCheck size={28} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">You have already voted in this election</h2>
        <p className="text-sm text-gray-500 mb-6">Each voter is allowed one vote per election.</p>
        <div className="flex items-center gap-3">
          <Link to="/voter-dashboard" className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <Link to={`/results/${id}`} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">
            View Results
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Cast Your Vote"
        subtitle={election.name}
        actions={
          step === 'select' && (
            <Link to="/voter-dashboard" className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg">
              <ArrowLeft size={16} /> Back
            </Link>
          )
        }
      />

      <AnimatePresence mode="wait">
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{election.name}</h3>
                  {election.electionType && <p className="text-sm text-gray-500 mt-1">{election.electionType}</p>}
                </div>
                <StatusBadge status={election.status} />
              </div>
              {election.endDate && (
                <p className="text-xs text-gray-400 mt-3">
                  Ends: {new Date(election.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Select your candidate</h4>
              {approvedCandidates.length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-sm text-gray-500">No approved candidates available for this election.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {approvedCandidates.map((candidate, i) => (
                    <motion.div
                      key={candidate._id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="card p-5 flex flex-col items-center text-center hover:border-primary-300 transition-colors cursor-pointer group"
                      onClick={() => handleSelect(candidate)}
                    >
                      {candidate.photo ? (
                        <img src={candidate.photo} alt={candidate.name} className="w-16 h-16 rounded-full object-cover mb-3" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold mb-3">
                          {candidate.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                      )}
                      <h5 className="text-sm font-semibold text-gray-900">{candidate.name}</h5>
                      {candidate.party && <p className="text-xs text-gray-500 mt-0.5">{candidate.party}</p>}
                      <button
                        className="mt-4 px-4 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-lg group-hover:bg-primary-600 group-hover:text-white transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleSelect(candidate); }}
                      >
                        Select
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {step === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-6 max-w-lg mx-auto"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Please review your selection</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Election:</span>
                <span className="font-medium text-gray-900">{election.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Candidate:</span>
                <span className="font-medium text-gray-900">{selectedCandidate?.name}</span>
              </div>
              {selectedCandidate?.party && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Party:</span>
                  <span className="font-medium text-gray-900">{selectedCandidate.party}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setStep('select'); setSelectedCandidate(null); }}
                className="btn-secondary flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                ) : (
                  <><ShieldCheck size={16} /> Confirm Vote</>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'confirm' && receipt && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-8 max-w-lg mx-auto text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">✓ Vote Recorded Successfully</h2>
            <p className="text-sm text-gray-500 mb-6">Your vote has been securely recorded.</p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <p className="text-xs text-gray-500 mb-1">Vote Receipt</p>
              <p className="text-sm font-mono font-semibold text-gray-900 break-all">{receipt.receiptId}</p>
              <p className="text-xs text-gray-400 mt-2">This receipt expires in 60 seconds and does not reveal your selection.</p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/voter-dashboard"
                className="btn-primary flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Return to Dashboard
              </Link>
              <Link
                to={`/results/${id}`}
                className="btn-secondary flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg"
              >
                View Election Results
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VotingPage;

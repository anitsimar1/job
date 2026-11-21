import { OfferSpotlight } from '../../types';
import { SafeImage } from '../common/SafeImage';

interface OfferReviewModalProps {
  open: boolean;
  offer: OfferSpotlight;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

export function OfferReviewModal({
  open,
  offer,
  onClose,
  onAccept,
  onDecline,
}: OfferReviewModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center p-2">
              <SafeImage
                alt={offer.company}
                className="w-full h-full object-contain"
                src={offer.companyLogo}
              />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold">
                Official Offer Letter
              </span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mt-1">
                {offer.roleTitle}
              </h3>
              <p className="font-body-sm text-on-surface-variant">{offer.company}</p>
            </div>
          </div>
          <button
            aria-label="Close offer review"
            className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="bg-surface-container-low rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="font-label-sm text-on-surface-variant">Base + Equity</span>
            <span className="font-label-lg text-tertiary font-bold">{offer.compensation}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-label-sm text-on-surface-variant">Equity Vesting</span>
            <span className="font-body-sm text-on-surface font-medium">{offer.equityDetails}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-label-sm text-on-surface-variant">Signing Bonus</span>
            <span className="font-body-sm text-on-surface font-medium">{offer.signingBonus}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-label-sm text-on-surface-variant">Decision Deadline</span>
            <span className="font-body-sm text-secondary font-semibold">{offer.decisionDeadline}</span>
          </div>
        </div>

        {offer.status === 'accepted' ? (
          <div className="p-3 rounded-xl bg-tertiary-fixed/40 text-tertiary font-label-md text-center font-bold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">verified</span>
            Offer Accepted! Onboarding packet sent.
          </div>
        ) : offer.status === 'declined' ? (
          <div className="p-3 rounded-xl bg-surface-container text-on-surface-variant font-label-md text-center font-semibold">
            Offer Declined
          </div>
        ) : (
          <div className="flex items-center gap-2.5 pt-1">
            <button
              className="flex-1 py-3 rounded-xl bg-surface-container-low hover:bg-error-container text-error font-label-md font-semibold transition-colors"
              onClick={() => {
                onDecline();
                onClose();
              }}
              type="button"
            >
              Decline Offer
            </button>
            <button
              className="flex-[1.5] py-3 rounded-xl bg-tertiary-container hover:bg-tertiary text-tertiary-fixed font-label-lg font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
              onClick={() => {
                onAccept();
                onClose();
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>Accept Offer</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
